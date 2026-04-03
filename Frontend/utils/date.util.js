function toDate(value) {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate;
}

export function toStartOfDayIso(value) {
  const date = toDate(value);
  if (!date) return undefined;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function toEndOfDayIso(value) {
  const date = toDate(value);
  if (!date) return undefined;

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

export function normalizeDateRange(fromValue, toValue) {
  const startDate = toStartOfDayIso(fromValue);
  const endDate = toEndOfDayIso(toValue);

  if (!startDate || !endDate) {
    return {
      startDate: undefined,
      endDate: undefined,
    };
  }

  if (new Date(startDate).getTime() <= new Date(endDate).getTime()) {
    return { startDate, endDate };
  }

  return {
    startDate: toStartOfDayIso(toValue),
    endDate: toEndOfDayIso(fromValue),
  };
}
