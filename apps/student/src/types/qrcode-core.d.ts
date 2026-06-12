declare module "qrcode/lib/core/qrcode" {
  type ErrorCorrectionLevel = "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";

  type QrCodeData = {
    modules: {
      size: number;
      data: ArrayLike<boolean | number>;
    };
  };

  const QrCode: {
    create(value: string, options?: { errorCorrectionLevel?: ErrorCorrectionLevel }): QrCodeData;
  };

  export default QrCode;
}
