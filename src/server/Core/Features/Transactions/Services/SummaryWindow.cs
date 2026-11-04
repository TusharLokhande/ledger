namespace Core.Features.Transactions.Services;

/// <summary>
/// Current and previous windows for the summary, compared like for like: the current window stops at
/// today, and the previous one covers the same span (whole months shift by N months, other ranges by
/// their length in days).
/// </summary>
public static class SummaryWindow
{
    public static (DateOnly CurrentFrom, DateOnly CurrentTo, DateOnly? PreviousFrom, DateOnly? PreviousTo) Compute(
        DateOnly from, DateOnly to, DateOnly asOf)
    {
        if (from > asOf)
            return (from, to, null, null);

        var end = to < asOf ? to : asOf;
        var wholeMonths = from.Day == 1 && to.Day == DateTime.DaysInMonth(to.Year, to.Month);
        if (wholeMonths)
        {
            var months = (to.Year - from.Year) * 12 + to.Month - from.Month + 1;
            // AddMonths clamps to the shorter month's end (31 Mar - 1 month = 28/29 Feb); a current window
            // that reaches its month's end compares against the whole previous month (30 Nov -> 31 Oct).
            var previousTo = end.AddMonths(-months);
            if (end.Day == DateTime.DaysInMonth(end.Year, end.Month))
                previousTo = new DateOnly(previousTo.Year, previousTo.Month, DateTime.DaysInMonth(previousTo.Year, previousTo.Month));
            return (from, end, from.AddMonths(-months), previousTo);
        }

        var days = end.DayNumber - from.DayNumber + 1;
        return (from, end, from.AddDays(-days), from.AddDays(-1));
    }
}
