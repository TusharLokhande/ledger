namespace Core.Common.Dashboard;

public class PageRequest<T>
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public PageSorting? Sorting { get; set; } = new PageSorting();
    public T? CustomFilter { get; set; }
    public List<PageFilter>? Filters { get; set; }
}

public class PageSorting
{
    public string? Field { get; set; }
    public string? Direction { get; set; }
}