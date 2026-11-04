using Core.Features.Imports.Interfaces;
using Hangfire;

namespace Infrastructure.Imports;

public class HangfireImportJobQueue : IImportJobQueue
{
    private readonly IBackgroundJobClient _jobs;

    public HangfireImportJobQueue(IBackgroundJobClient jobs)
    {
        _jobs = jobs;
    }

    public void Enqueue(Guid batchId, Guid userId)
        => _jobs.Enqueue<ImportJob>(job => job.RunAsync(batchId, userId, CancellationToken.None));
}
