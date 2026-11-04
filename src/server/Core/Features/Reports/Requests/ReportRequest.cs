namespace Core.Features.Reports.Requests;

public class ReportRequest
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    /// <summary>The client's local "today": the current window stops here and the 12-month trend ends with its month.</summary>
    public DateOnly AsOf { get; set; }
}
