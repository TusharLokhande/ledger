namespace Core.Features.Imports.Interfaces;

public interface IImportTemplateBuilder
{
    /// <summary>The .xlsx template with dropdowns for the given account and category names.</summary>
    byte[] Build(IReadOnlyList<string> accountNames, IReadOnlyList<string> categoryNames);
}
