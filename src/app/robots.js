export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://barbearia.nexawi.com.br";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/c/"], disallow: ["/dashboard/", "/dashboard-admin/", "/admin/", "/api/"] },
    ],
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
