namespace Core.Features.Reports.Services;

/// <summary>
/// Earlier windows to compare the current one with, like for like (same rule as the Transactions
/// summary): whole-month ranges step back by their month count, other ranges by their length in days.
/// </summary>
public static class ReportWindows
{
    /// <param name="end">The current window's last day (the range end, or today if sooner).</param>
    public static List<(DateOnly From, DateOnly To)> Previous(DateOnly from, DateOnly to, DateOnly end, int count)
    {
        var wholeMonths = from.Day == 1 && to.Day == DateTime.DaysInMonth(to.Year, to.Month);
        var months = (to.Year - from.Year) * 12 + to.Month - from.Month + 1;
        var days = end.DayNumber - from.DayNumber + 1;
        var endIsMonthEnd = end.Day == DateTime.DaysInMonth(end.Year, end.Month);

        var windows = new List<(DateOnly, DateOnly)>(count);
        for (var k = 1; k <= count; k++)
        {
            if (!wholeMonths)
            {
                windows.Add((from.AddDays(-k * days), end.AddDays(-k * days)));
                continue;
            }

            // AddMonths clamps to the shorter month's end; a window reaching its month's end compares
            // against whole earlier months (30 Nov -> 31 Oct).
            var t = end.AddMonths(-k * months);
            if (endIsMonthEnd)
                t = new DateOnly(t.Year, t.Month, DateTime.DaysInMonth(t.Year, t.Month));
            windows.Add((from.AddMonths(-k * months), t));
        }

        return windows;
    }
}
