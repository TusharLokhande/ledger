using Core.Common;
using Core.Features.Reports.Dto;
using Core.Features.Reports.Requests;

namespace Core.Features.Reports.Interfaces;

public interface IReportService
{
    Task<Result<ReportDto>> GetAsync(ReportRequest request, CancellationToken cancellationToken = default);
}
