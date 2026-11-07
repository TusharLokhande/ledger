namespace Core.Features.Home.Requests;

public class HomeCalendarRequest
{
    /// <summary>Any day in the month to show.</summary>
    public DateOnly Month { get; set; }
}
