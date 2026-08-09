import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  clinicTimeZone,
  dateFromClinicLocal,
  dateKeyInTimeZone,
  getWorkingPeriods,
  inactiveDateFor,
  localTimeFromDate,
  utcRangeForClinicDate,
  weekdayFromDateKey,
} from "@/lib/clinic/schedule";
import { intervalsOverlap, totalAppointmentMinutes } from "@/lib/domain/schedule-core.mjs";

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateTime(date, minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${date}T${pad(hours)}:${pad(mins)}`;
}

function overlaps(startMinutes, endMinutes, booking, date, timeZone) {
  const start = new Date(booking.inicio);
  const end = new Date(booking.fim);
  if (dateKeyInTimeZone(start, timeZone) !== date) return false;
  const bookingStart = localTimeFromDate(start, timeZone);
  const bookingEnd = dateKeyInTimeZone(end, timeZone) === date ? localTimeFromDate(end, timeZone) : 24 * 60;
  return intervalsOverlap(startMinutes, endMinutes, bookingStart, bookingEnd);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get("slug") || "").trim();
  const serviceIds = Array.from(new Set([
    ...searchParams.getAll("servico_ids"),
    String(searchParams.get("servico_id") || ""),
  ].map((item) => String(item || "").trim()).filter(Boolean)));
  const barberId = String(searchParams.get("barbeiro_id") || "").trim();
  const date = String(searchParams.get("date") || "").trim();

  if (!slug || !serviceIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ slots: [], message: "Parâmetros inválidos." }, { status: 400 });
  }

  const { data: barbershop, error: barbershopError } = await supabaseAdmin
    .from("barbearias")
    .select("id, nome, slug, status, metadata")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .maybeSingle();

  if (barbershopError) throw barbershopError;
  if (!barbershop || barbershop.metadata?.site_publico?.publicado === false) {
    return NextResponse.json({ slots: [], message: "Barbearia indisponível." }, { status: 404 });
  }

  const { data: services = [], error: serviceError } = await supabaseAdmin
    .from("barbearia_servicos")
    .select("id, duracao_minutos, intervalo_minutos")
    .eq("barbearia_id", barbershop.id)
    .in("id", serviceIds)
    .eq("ativo", true)
    .eq("publicado_site", true);

  if (serviceError) throw serviceError;
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ slots: [], message: "Um ou mais serviços estão indisponíveis." }, { status: 404 });
  }

  let barbersQuery = supabaseAdmin
    .from("barbearia_barbeiros")
    .select("id, nome")
    .eq("barbearia_id", barbershop.id)
    .eq("ativo", true)
    .order("nome");

  if (barberId) barbersQuery = barbersQuery.eq("id", barberId);

  const { data: barbers = [], error: barbersError } = await barbersQuery;
  if (barbersError) throw barbersError;
  if (!barbers.length) return NextResponse.json({ slots: [], message: "Nenhum barbeiro disponível." });

  const schedule = barbershop.metadata?.horario_funcionamento || {};
  const timeZone = clinicTimeZone(barbershop);
  const inactiveDate = inactiveDateFor(schedule, date, timeZone);
  if (inactiveDate) {
    return NextResponse.json({ slots: [], message: inactiveDate.motivo || "Barbearia sem atendimento nesta data." });
  }

  const day = weekdayFromDateKey(date);
  const periods = getWorkingPeriods(schedule, day);
  if (!periods.length) return NextResponse.json({ slots: [], message: "A barbearia não atende nesta data." });

  const duration = totalAppointmentMinutes(services, { defaultDuration: 30, includeIntervals: true });
  if (!periods.some((period) => period.end >= period.start + duration)) {
    return NextResponse.json({ slots: [], message: "Expediente insuficiente para os serviços selecionados." });
  }

  const dateRange = utcRangeForClinicDate(date, timeZone);
  if (!dateRange) return NextResponse.json({ slots: [], message: "Data inválida." }, { status: 400 });

  const { data: bookings = [], error: bookingsError } = await supabaseAdmin
    .from("barbearia_agendamentos")
    .select("id, barbeiro_id, inicio, fim, status")
    .eq("barbearia_id", barbershop.id)
    .in("barbeiro_id", barbers.map((item) => item.id))
    .not("status", "eq", "cancelado")
    .gte("inicio", dateRange.start.toISOString())
    .lt("inicio", dateRange.end.toISOString());

  if (bookingsError) throw bookingsError;

  const now = new Date();
  const slots = [];
  for (const period of periods) {
    for (let minutes = period.start; minutes + duration <= period.end; minutes += 30) {
      const value = localDateTime(date, minutes);
      const slotDate = dateFromClinicLocal(value, timeZone);
      if (!slotDate || slotDate <= now) continue;

      const availableBarber = barbers.find((barber) => {
        const barberBookings = bookings.filter((booking) => booking.barbeiro_id === barber.id);
        return !barberBookings.some((booking) => overlaps(minutes, minutes + duration, booking, date, timeZone));
      });
      if (!availableBarber) continue;

      slots.push({
        value,
        label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
        barbeiro_id: availableBarber.id,
        profissional_nome: availableBarber.nome,
      });
    }
  }

  return NextResponse.json({ slots });
}
