namespace Core.Common.Dashboard;

public class PageFilter
{
    public string Field { get; set; } = string.Empty;
    public string? Variant { get; set; }
    public string Operator { get; set; } = string.Empty;
    public List<string>? Values { get; set; }
}
