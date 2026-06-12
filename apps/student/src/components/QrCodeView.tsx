import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import QrCode from "qrcode/lib/core/qrcode";

type QrCodeViewProps = {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
};

type QrMatrix = {
  modules: {
    size: number;
    data: ArrayLike<boolean | number>;
  };
};

const QUIET_ZONE_MODULES = 4;

export function QrCodeView({ value, size = 156, color = "#07111f", backgroundColor = "#ffffff" }: QrCodeViewProps) {
  const matrix = useMemo(() => QrCode.create(value, { errorCorrectionLevel: "M" }) as QrMatrix, [value]);
  const moduleCount = matrix.modules.size;
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;

  return (
    <View
      accessibilityLabel="Student QR code"
      accessibilityRole="image"
      style={[styles.code, { width: size, height: size, backgroundColor }]}
    >
      {Array.from({ length: totalModules }, (_, row) => (
        <View key={`row-${row}`} style={styles.row}>
          {Array.from({ length: totalModules }, (_, column) => {
            const qrRow = row - QUIET_ZONE_MODULES;
            const qrColumn = column - QUIET_ZONE_MODULES;
            const isInside = qrRow >= 0 && qrColumn >= 0 && qrRow < moduleCount && qrColumn < moduleCount;
            const isDark = isInside && Boolean(matrix.modules.data[qrRow * moduleCount + qrColumn]);

            return <View key={`${row}-${column}`} style={[styles.cell, isDark ? { backgroundColor: color } : null]} />;
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  code: {
    overflow: "hidden"
  },
  row: {
    flex: 1,
    flexDirection: "row"
  },
  cell: {
    flex: 1
  }
});
