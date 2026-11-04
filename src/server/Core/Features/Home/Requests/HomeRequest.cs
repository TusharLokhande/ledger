namespace Core.Features.Home.Requests;

public class HomeRequest
{
    /// <summary>Any day in the month to show.</summary>
    public DateOnly Month { get; set; }
    /// <summary>The client's local "today": spending stops here.</summary>
    public DateOnly AsOf { get; set; }
}
