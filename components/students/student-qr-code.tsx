"use client";

import { QRCodeSVG } from "qrcode.react";

export function StudentQrCode({ token }: { token: string }) {
  return <QRCodeSVG value={token} size={132} level="M" />;
}
