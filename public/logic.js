(function (root, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.NamaaLogic = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STRICT_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var DAY_MS = 24 * 60 * 60 * 1000;

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInMonth(year, month) {
    var lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return lengths[month - 1] || 0;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function makeCalendarDate(year, month, day) {
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      throw new RangeError('Year must be an integer from 0001 through 9999.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError('Month must be an integer from 01 through 12.');
    }
    var maximumDay = daysInMonth(year, month);
    if (!Number.isInteger(day) || day < 1 || day > maximumDay) {
      throw new RangeError('Day is outside the selected calendar month.');
    }

    return Object.freeze({
      year: year,
      month: month,
      day: day,
      iso: String(year).padStart(4, '0') + '-' + pad2(month) + '-' + pad2(day),
    });
  }

  /** Parse exactly YYYY-MM-DD. Whitespace and partial dates are rejected. */
  function parseStrictDate(value) {
    if (typeof value !== 'string') {
      throw new TypeError('Calendar date must be a YYYY-MM-DD string.');
    }

    var match = STRICT_DATE.exec(value);
    if (!match) {
      throw new RangeError('Calendar date must use the exact YYYY-MM-DD format.');
    }

    return makeCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  function asCalendarDate(value, label) {
    if (typeof value === 'string') {
      return parseStrictDate(value);
    }
    if (value && typeof value === 'object') {
      try {
        return makeCalendarDate(value.year, value.month, value.day);
      } catch (error) {
        error.message = (label || 'Date') + ': ' + error.message;
        throw error;
      }
    }
    throw new TypeError((label || 'Date') + ' must be a YYYY-MM-DD string or parsed calendar date.');
  }

  function compareDates(left, right) {
    if (left.year !== right.year) return left.year < right.year ? -1 : 1;
    if (left.month !== right.month) return left.month < right.month ? -1 : 1;
    if (left.day !== right.day) return left.day < right.day ? -1 : 1;
    return 0;
  }

  function localToday() {
    var now = new Date();
    return makeCalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function addYearsClamped(date, years) {
    var targetYear = date.year + years;
    return makeCalendarDate(targetYear, date.month, Math.min(date.day, daysInMonth(targetYear, date.month)));
  }

  function addMonthsClamped(date, months) {
    var zeroBased = date.year * 12 + (date.month - 1) + months;
    var targetYear = Math.floor(zeroBased / 12);
    var targetMonth = (((zeroBased % 12) + 12) % 12) + 1;
    return makeCalendarDate(
      targetYear,
      targetMonth,
      Math.min(date.day, daysInMonth(targetYear, targetMonth)),
    );
  }

  function daysBetween(start, end) {
    var startUtc = Date.UTC(start.year, start.month - 1, start.day);
    var endUtc = Date.UTC(end.year, end.month - 1, end.day);
    return Math.round((endUtc - startUtc) / DAY_MS);
  }

  /**
   * Return completed calendar years, then months, then days.
   *
   * When an anniversary would fall beyond the end of a month, it is clamped
   * to that month's last day. For example, 2024-02-29 to 2025-02-28 is one
   * completed year, and 2023-01-31 to 2023-02-28 is one completed month.
   * The test date must be on or before today's local calendar date.
   */
  function calendarAge(dateOfBirth, testDate) {
    var birth = asCalendarDate(dateOfBirth, 'Date of birth');
    var tested = asCalendarDate(testDate, 'Test date');
    var today = localToday();

    if (compareDates(birth, today) > 0) {
      throw new RangeError('Date of birth cannot be in the future.');
    }
    if (compareDates(tested, today) > 0) {
      throw new RangeError("Test date cannot be later than today's local date.");
    }
    if (compareDates(tested, birth) < 0) {
      throw new RangeError('Test date cannot be earlier than date of birth.');
    }

    var years = tested.year - birth.year;
    var yearAnchor = addYearsClamped(birth, years);
    if (compareDates(yearAnchor, tested) > 0) {
      years -= 1;
      yearAnchor = addYearsClamped(birth, years);
    }

    var months = (tested.year - yearAnchor.year) * 12 + tested.month - yearAnchor.month;
    var monthAnchor = addMonthsClamped(yearAnchor, months);
    if (compareDates(monthAnchor, tested) > 0) {
      months -= 1;
      monthAnchor = addMonthsClamped(yearAnchor, months);
    }

    var days = daysBetween(monthAnchor, tested);
    return Object.freeze({
      years: years,
      months: months,
      days: days,
      totalMonths: years * 12 + months,
    });
  }

  /** Normalize Arabic/Latin search text while retaining letters and digits. */
  function normalizeArabic(value) {
    var text = value == null ? '' : String(value);
    var digitMap = {
      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',
      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9',
    };

    return text
      .normalize('NFKC')
      .replace(/[٠-٩۰-۹]/g, function (digit) {
        return digitMap[digit];
      })
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئىيی]/g, 'ي')
      .replace(/[ةۀ]/g, 'ه')
      .replace(/[ک]/g, 'ك')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function isMissingScore(score) {
    return score == null || (typeof score === 'string' && score.trim() === '');
  }

  /**
   * Aggregate synthetic item answers without applying clinical scoring rules.
   * Entries are {subdomainId, score}; score must be integer 0, 1, or 2.
   * Missing values (null, undefined, or blank string) are counted as missing,
   * never converted to zero.
   */
  function aggregateSyntheticAnswers(entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError('Answer entries must be an array.');
    }

    var bySubdomain = Object.create(null);
    var total = 0;
    var answeredCount = 0;
    var missingCount = 0;

    entries.forEach(function (entry, index) {
      if (!entry || typeof entry !== 'object') {
        throw new TypeError('Answer entry at index ' + index + ' must be an object.');
      }

      var subdomainId = typeof entry.subdomainId === 'string' ? entry.subdomainId.trim() : '';
      if (!subdomainId) {
        throw new TypeError('Answer entry at index ' + index + ' requires a non-empty subdomainId.');
      }

      if (!Object.prototype.hasOwnProperty.call(bySubdomain, subdomainId)) {
        bySubdomain[subdomainId] = {
          total: 0,
          answeredCount: 0,
          missingCount: 0,
        };
      }

      var bucket = bySubdomain[subdomainId];
      var score = entry.score;
      if (isMissingScore(score)) {
        missingCount += 1;
        bucket.missingCount += 1;
        return;
      }

      if (!Number.isInteger(score) || score < 0 || score > 2) {
        throw new RangeError(
          'Score at index ' + index + ' must be the integer 0, 1, or 2, or a missing value.',
        );
      }

      total += score;
      answeredCount += 1;
      bucket.total += score;
      bucket.answeredCount += 1;
    });

    Object.keys(bySubdomain).forEach(function (id) {
      Object.freeze(bySubdomain[id]);
    });

    return Object.freeze({
      total: total,
      answeredCount: answeredCount,
      missingCount: missingCount,
      bySubdomain: Object.freeze(bySubdomain),
    });
  }

  return Object.freeze({
    parseStrictDate: parseStrictDate,
    localToday: localToday,
    calendarAge: calendarAge,
    normalizeArabic: normalizeArabic,
    aggregateSyntheticAnswers: aggregateSyntheticAnswers,
  });
});
