// Minimal QR Code generator (TypeScript) based on Kazuhiko Arase's QRCode for JavaScript (MIT)
// This implementation supports auto type number and error correction level 'M' for short strings
// and returns an SVG path. Intended for short payloads like a receipt number.
// Source adapted and reduced for project needs. If you need more features, replace with a proper package.

/* eslint-disable @typescript-eslint/no-explicit-any */

// Public API
export function qrSvg(text: string, pixelSize = 3, margin = 2): string {
  const qrcode = QRCodeModel.getBestTypeForString(text, QRMode.MODE_8BIT_BYTE, QRErrorCorrectLevel.M);
  qrcode.addData(text);
  qrcode.make();
  const moduleCount = qrcode.getModuleCount();
  const cell = pixelSize;
  const quiet = margin;
  const size = (moduleCount + quiet * 2) * cell;
  const rects: string[] = [];
  for (let r = 0; r < moduleCount; r++) {
    let runStart = -1;
    for (let c = 0; c < moduleCount; c++) {
      const isDark = qrcode.isDark(r, c);
      if (isDark) {
        if (runStart < 0) runStart = c;
      } else if (runStart >= 0) {
        rects.push(rect(runStart, r, c - runStart));
        runStart = -1;
      }
    }
    if (runStart >= 0) {
      rects.push(rect(runStart, r, moduleCount - runStart));
    }
  }
  const path = rects.join(' ');
  const vb = `0 0 ${size} ${size}`;
  const translate = quiet * cell;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}" shape-rendering="crispEdges">\n  <rect width="100%" height="100%" fill="#fff"/>\n  <path d="M ${translate} ${translate} ${path}" fill="#000"/>\n</svg>`;

  function rect(x: number, y: number, w: number): string {
    // Generate a horizontal run rectangle using relative path commands
    const X = (x * cell).toString();
    const Y = (y * cell).toString();
    const W = (w * cell).toString();
    const H = cell.toString();
    return `M ${translate + Number(X)} ${translate + Number(Y)} h ${W} v ${H} h -${W} Z`;
  }
}

// ————————————————— QR internals —————————————————
const QRMode = {
  MODE_NUMBER: 1,
  MODE_ALPHA_NUM: 2,
  MODE_8BIT_BYTE: 4,
  MODE_KANJI: 8,
} as const;

const QRErrorCorrectLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
} as const;

type ECL = typeof QRErrorCorrectLevel[keyof typeof QRErrorCorrectLevel];

type Polynomial = number[];

class QRMath {
  static readonly EXP_TABLE: number[] = new Array(256);
  static readonly LOG_TABLE: number[] = new Array(256);

  static init(): void {
    for (let i = 0; i < 8; i++) {
      QRMath.EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; i++) {
      QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 256; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }
  }

  static gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return QRMath.EXP_TABLE[n];
  }

  static glog(n: number): number {
    if (n < 1) throw new Error('glog(' + n + ')');
    return QRMath.LOG_TABLE[n];
  }
}
QRMath.init();

class QRPolynomial {
  num: Polynomial;
  constructor(num: Polynomial, shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }
  get length(): number {
    return this.num.length;
  }
  multiply(e: QRPolynomial): QRPolynomial {
    const num: number[] = new Array(this.length + e.length - 1).fill(0);
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < e.length; j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.num[i]) + QRMath.glog(e.num[j]));
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e: QRPolynomial): QRPolynomial {
    if (this.length - e.length < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.num[0]) - QRMath.glog(e.num[0]);
    const num = this.num.slice();
    for (let i = 0; i < e.length; i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.num[i]) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

const RS_BLOCK_TABLE: number[][] = [
  // L, M, Q, H for type 1..40 (we only use small ones). Format: [L: (count, data), M: ...]
  // type 1
  [1, 26, 19, 1, 26, 16, 1, 26, 13, 1, 26, 9],
  // type 2
  [1, 44, 34, 1, 44, 28, 1, 44, 22, 1, 44, 16],
  // type 3
  [1, 70, 55, 1, 70, 44, 2, 35, 17, 2, 35, 13],
  // type 4
  [1, 100, 80, 2, 50, 32, 2, 50, 24, 4, 25, 9],
  // type 5
  [1, 134, 108, 2, 67, 43, 2, 33, 15, 2, 33, 11],
];

function getRSBlocks(typeNumber: number, errorCorrectLevel: ECL): { dataCount: number; totalCount: number }[] {
  const eclIndex = errorCorrectLevel;
  const rs = RS_BLOCK_TABLE[typeNumber - 1];
  if (!rs) throw new Error('bad rs block @ type:' + typeNumber);
  const list: { dataCount: number; totalCount: number }[] = [];
  for (let i = 0; i < rs.length; i += 3) {
    const count = rs[i];
    const totalCount = rs[i + 1];
    const dataCount = rs[i + 2];
    for (let c = 0; c < count; c++) {
      list.push({ totalCount, dataCount });
    }
  }
  // The table defined above is arranged L,M,Q,H sequentially
  const size = list.length / 4;
  const start = eclIndex * size;
  return list.slice(start, start + size);
}

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;
  get(index: number): boolean {
    return ((this.buffer[Math.floor(index / 8)] >>> (7 - (index % 8))) & 1) === 1;
  }
  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }
  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 128 >>> (this.length % 8);
    }
    this.length++;
  }
}

class QR8BitByte {
  data: string;
  constructor(data: string) { this.data = data; }
  getLength(): number { return this.data.length; }
  write(buffer: QRBitBuffer): void {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
}

class QRCodeModel {
  typeNumber: number;
  errorCorrectLevel: ECL;
  modules: boolean[][] | null = null;
  moduleCount = 0;
  dataList: QR8BitByte[] = [];

  constructor(typeNumber: number, errorCorrectLevel: ECL) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  static getBestTypeForString(text: string, mode: number, ecl: ECL): QRCodeModel {
    // Choose a small type sufficient for data length; we support up to type 5 here
    const len = text.length;
    let type = 1;
    if (len <= 14) type = 1; // EC M capacity ~14 bytes
    else if (len <= 26) type = 2;
    else if (len <= 42) type = 3;
    else if (len <= 62) type = 4;
    else type = 5;
    return new QRCodeModel(type, ecl);
  }

  addData(data: string): void {
    this.dataList.push(new QR8BitByte(data));
  }

  isDark(row: number, col: number): boolean {
    if (!this.modules) return false;
    return !!this.modules[row][col];
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make(): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null as any);
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(false, 0);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(false);
    }

    const data = this.createData();
    this.mapData(data);
  }

  setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules![row + r][col + c] = true;
        } else {
          this.modules![row + r][col + c] = false;
        }
      }
    }
  }

  setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules![r][6] !== null) continue;
      this.modules![r][6] = r % 2 === 0;
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules![6][c] !== null) continue;
      this.modules![6][c] = c % 2 === 0;
    }
  }

  setupPositionAdjustPattern(): void {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules![row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            this.modules![row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          }
        }
      }
    }
  }

  setupTypeNumber(test: boolean): void {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      this.modules![Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules![(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (QRErrorCorrectLevel.M << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 6) this.modules![i][8] = mod;
      else if (i < 8) this.modules![i + 1][8] = mod;
      else this.modules![this.moduleCount - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) === 1;
      if (i < 8) this.modules![8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules![8][15 - i - 1 + 1] = mod;
      else this.modules![8][15 - i - 1] = mod;
    }
    this.modules![this.moduleCount - 8][8] = !test;
  }

  mapData(data: number[]): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          if (this.modules![row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QRUtil.getMask(0, row, col - c);
            this.modules![row][col - c] = mask ? !dark : dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  createData(): number[] {
    const rsBlocks = getRSBlocks(this.typeNumber, this.errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < this.dataList.length; i++) {
      const data = this.dataList[i];
      buffer.put(QRMode.MODE_8BIT_BYTE, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(QRMode.MODE_8BIT_BYTE, this.typeNumber));
      data.write(buffer);
    }
    // calc total data count
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    // end code
    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }
    // padding
    const PAD0 = 0xec;
    const PAD1 = 0x11;
    let i = 0;
    while (buffer.length / 8 < totalDataCount) {
      buffer.put((i % 2 === 0) ? PAD0 : PAD1, 8);
      i++;
    }
    return QRUtil.createBytes(buffer, rsBlocks);
  }
}

class QRUtil {
  static PATTERN_POSITION_TABLE: number[][] = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
  ];

  static G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
  static G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
  static G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

  static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
    }
    return (data << 10) | d;
  }

  static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
    }
    return (data << 12) | d;
  }

  static getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  static getPatternPosition(typeNumber: number): number[] {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  }

  static getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return ((i + j) % 2) === 0;
      default: return false;
    }
  }

  static getLengthInBits(mode: number, type: number): number {
    if (type <= 9) {
      switch (mode) {
        case QRMode.MODE_NUMBER: return 10;
        case QRMode.MODE_ALPHA_NUM: return 9;
        case QRMode.MODE_8BIT_BYTE: return 8;
        case QRMode.MODE_KANJI: return 8;
      }
    } else if (type <= 26) {
      switch (mode) {
        case QRMode.MODE_NUMBER: return 12;
        case QRMode.MODE_ALPHA_NUM: return 11;
        case QRMode.MODE_8BIT_BYTE: return 16;
        case QRMode.MODE_KANJI: return 10;
      }
    } else {
      switch (mode) {
        case QRMode.MODE_NUMBER: return 14;
        case QRMode.MODE_ALPHA_NUM: return 13;
        case QRMode.MODE_8BIT_BYTE: return 16;
        case QRMode.MODE_KANJI: return 12;
      }
    }
    return 0;
  }

  static createBytes(buffer: QRBitBuffer, rsBlocks: { dataCount: number; totalCount: number }[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata: number[][] = [];
    const ecdata: number[][] = [];

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcCount; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.length - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.length - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + (ecdata[r].length - modPoly.length);
        ecdata[r][i] = modIndex >= 0 ? modPoly.num[modIndex] : 0;
      }
    }

    const totalCodeCount = rsBlocks.reduce((sum, b) => sum + b.totalCount, 0);
    const data: number[] = new Array(totalCodeCount);
    let index = 0;

    // interleave data code words
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }
    // interleave error correction code words
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  }

  static getErrorCorrectPolynomial(ecLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < ecLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }
}
