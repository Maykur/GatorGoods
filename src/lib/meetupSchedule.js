const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;
const DEFAULT_SCHEDULING_WINDOW_DAYS = 14;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function toLocalDateInputValue(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function isValidMeetupDate(value) {
  const normalizedValue = normalizeText(value);

  if (!DATE_INPUT_PATTERN.test(normalizedValue)) {
    return false;
  }

  return toLocalDateInputValue(new Date(`${normalizedValue}T12:00:00`)) === normalizedValue;
}

function isValidMeetupTime(value) {
  const normalizedValue = normalizeText(value);

  if (!TIME_INPUT_PATTERN.test(normalizedValue)) {
    return false;
  }

  const [hours, minutes] = normalizedValue.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function parseMeetupDateTime(meetupDate, meetupTime) {
  const normalizedDate = normalizeText(meetupDate);
  const normalizedTime = normalizeText(meetupTime);

  if (!isValidMeetupDate(normalizedDate) || !isValidMeetupTime(normalizedTime)) {
    return null;
  }

  const parsedDate = new Date(`${normalizedDate}T${normalizedTime}:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getSchedulingWindowStart(now = new Date()) {
  return new Date(`${toLocalDateInputValue(now)}T00:00:00`);
}

function getSchedulingWindowDates({now = new Date(), days = DEFAULT_SCHEDULING_WINDOW_DAYS} = {}) {
  const startDate = getSchedulingWindowStart(now);

  return Array.from({length: Math.max(0, days)}, (_, index) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + index);
    return toLocalDateInputValue(nextDate);
  });
}

function isMeetupDateWithinSchedulingWindow(
  meetupDate,
  {now = new Date(), days = DEFAULT_SCHEDULING_WINDOW_DAYS} = {}
) {
  const normalizedDate = normalizeText(meetupDate);

  if (!isValidMeetupDate(normalizedDate)) {
    return false;
  }

  return getSchedulingWindowDates({now, days}).includes(normalizedDate);
}

function formatMeetupTimeLabel(value, fallback = '') {
  const parsedDate = parseMeetupDateTime('2000-01-01', value);

  if (!parsedDate) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate);
}

function formatMeetupDateLabel(value, fallback = '') {
  if (!isValidMeetupDate(value)) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function getMeetupScheduleValidationErrors(
  values = {},
  {now = new Date(), days = DEFAULT_SCHEDULING_WINDOW_DAYS} = {}
) {
  const errors = {};
  const meetupDate = normalizeText(values.meetupDate);
  const meetupTime = normalizeText(values.meetupTime);

  if (!meetupDate) {
    errors.meetupDate = 'Meetup date is required.';
  } else if (!isValidMeetupDate(meetupDate)) {
    errors.meetupDate = 'Meetup date is invalid.';
  } else if (!isMeetupDateWithinSchedulingWindow(meetupDate, {now, days})) {
    errors.meetupDate = 'Meetup date must be within the next 2 weeks.';
  }

  if (!meetupTime) {
    errors.meetupTime = 'Meetup time is required.';
  } else if (!isValidMeetupTime(meetupTime)) {
    errors.meetupTime = 'Meetup time is invalid.';
  }

  return errors;
}

function formatMeetupScheduleLabel({meetupDate, meetupTime, meetupStartAt, meetupEndAt} = {}, fallback = 'Meetup details pending') {
  const parsedDateTime = parseMeetupDateTime(meetupDate, meetupTime);

  if (parsedDateTime) {
    return `${formatMeetupDateLabel(meetupDate)} at ${formatMeetupTimeLabel(meetupTime)}`;
  }

  const legacyStartDateTime = parseMeetupDateTime(meetupDate, meetupStartAt);
  const legacyEndDateTime = parseMeetupDateTime(meetupDate, meetupEndAt);

  if (legacyStartDateTime && legacyEndDateTime && legacyStartDateTime < legacyEndDateTime) {
    return `${formatMeetupDateLabel(meetupDate)}, ${formatMeetupTimeLabel(meetupStartAt)} - ${formatMeetupTimeLabel(meetupEndAt)}`;
  }

  return fallback;
}

function getOfferMeetupScheduleLabel(offer = {}, fallback = 'Meetup details pending') {
  const formattedLabel = formatMeetupScheduleLabel(offer, '');

  if (formattedLabel) {
    return formattedLabel;
  }

  const legacyLabel = normalizeText(offer?.meetupWindow);
  return legacyLabel || fallback;
}

function isMeetupScheduledToday(offer = {}, now = new Date()) {
  const normalizedMeetupDate = normalizeText(offer?.meetupDate);

  if (isValidMeetupDate(normalizedMeetupDate)) {
    return normalizedMeetupDate === toLocalDateInputValue(now);
  }

  return /\btoday\b/i.test(normalizeText(offer?.meetupWindow));
}

const exported = {
  DEFAULT_SCHEDULING_WINDOW_DAYS,
  formatMeetupDateLabel,
  formatMeetupScheduleLabel,
  formatMeetupTimeLabel,
  getMeetupScheduleValidationErrors,
  getOfferMeetupScheduleLabel,
  getSchedulingWindowDates,
  isMeetupDateWithinSchedulingWindow,
  isMeetupScheduledToday,
  isValidMeetupDate,
  isValidMeetupTime,
  parseMeetupDateTime,
  toLocalDateInputValue,
};

module.exports = exported;
module.exports.default = exported;
