import { format, parseISO } from "date-fns";

export function formatDateTime(iso: string | null | undefined, f: string = "yyyy-MM-dd HH:mm") {
  if (!iso) return "";
  try {
    return format(parseISO(iso), f);
  } catch (e) {
    return iso;
  }
}


