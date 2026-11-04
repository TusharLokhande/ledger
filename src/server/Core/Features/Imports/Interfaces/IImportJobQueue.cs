namespace Core.Features.Imports.Interfaces;

public interface IImportJobQueue
{
    void Enqueue(Guid batchId, Guid userId);
}
