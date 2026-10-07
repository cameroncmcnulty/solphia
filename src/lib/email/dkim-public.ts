export const DKIM_SELECTOR = "solphia";
export const DKIM_DOMAIN = "solphia.io";
/** DNS TXT p= for solphia._domainkey.solphia.io */
export const DKIM_PUBLIC_P = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxaqzJSTAWEYtGaYyDD9z++LmaMOmbAMKnLEd53o+p8Q76txATrOGRt0y6d2emAmJDma8jEXQQDfocBAvg7jFoHc7ZWHq+8FR2aJDB4MujT/mklWEw7V9MMh6deICtcLZRTHUDxdHPZDX6rbjMvtE2YR6/zzdClIYdV4/DzVmGeQwZ2l2ySSLNr2Svav1BgnIluUxBM9tV4hPs5LXybMTQOZ6tUuQAanQPEHqfkuPv0xpSC26Yd9RkS73TjiyZ0rPC8zVu8xu5eqyH3R516NT7qX01VhfjRoBqq0jQB9EoASSzPdeMf//QBgVNdwQQkNtli/XZ+jvh0B8ntXTPdmq3QIDAQAB";

export function dkimDnsHost(): string {
  return `${DKIM_SELECTOR}._domainkey.${DKIM_DOMAIN}`;
}

export function dkimDnsTxt(): string {
  return `v=DKIM1; k=rsa; p=${DKIM_PUBLIC_P}`;
}

export function dmarcDnsHost(): string {
  return `_dmarc.${DKIM_DOMAIN}`;
}

export function dmarcDnsTxt(): string {
  return `v=DMARC1; p=none; rua=mailto:admin@${DKIM_DOMAIN}; adkim=s; aspf=r`;
}

export function spfDnsTxt(): string {
  return `v=spf1 a:mail.${DKIM_DOMAIN} ~all`;
}

export function mailHeloName(): string {
  return `mail.${DKIM_DOMAIN}`;
}
