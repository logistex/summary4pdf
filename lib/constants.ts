export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
export const MAX_PAGE_COUNT = 20;

export const NOT_PDF_MESSAGE = "PDF 파일만 업로드할 수 있습니다.";
export const SIZE_LIMIT_MESSAGE = `문서가 너무 큽니다(최대 ${MAX_FILE_SIZE_MB}MB, ${MAX_PAGE_COUNT}페이지).`;
export const SIZE_LIMIT_HINT = `최대 ${MAX_FILE_SIZE_MB}MB, ${MAX_PAGE_COUNT}페이지`;
export const EXTRACT_FAILED_MESSAGE = "이 PDF에서 텍스트를 추출할 수 없습니다.";
export const SUMMARY_FAILED_MESSAGE =
  "요약 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
export const TIMEOUT_MESSAGE =
  "처리 시간이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.";
export const NETWORK_ERROR_MESSAGE =
  "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
