using Api.Common;
using Core.Features.Reports.Interfaces;
using Core.Features.Reports.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;

    public ReportsController(IReportService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Get(ReportRequest request, CancellationToken cancellationToken)
        => (await _service.GetAsync(request, cancellationToken)).ToActionResult();
}
