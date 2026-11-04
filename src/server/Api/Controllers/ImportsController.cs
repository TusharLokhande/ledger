using Api.Common;
using Core.Common;
using Core.Features.Imports.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/imports")]
[Authorize]
public class ImportsController : ControllerBase
{
    private const string XlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private readonly IImportService _service;

    public ImportsController(IImportService service)
    {
        _service = service;
    }

    [HttpGet("template")]
    public async Task<IActionResult> Template(CancellationToken cancellationToken)
        => FileOrError(await _service.GetTemplateAsync(cancellationToken));

    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null)
            return Result<object>.ValidationFailure(new() { ["file"] = ["Choose a file to upload."] }).ToActionResult();

        await using var stream = file.OpenReadStream();
        return (await _service.UploadAsync(file.FileName, file.Length, stream, cancellationToken)).ToActionResult();
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
        => (await _service.ListAsync(cancellationToken)).ToActionResult();

    [HttpGet("{id:guid}/errors")]
    public async Task<IActionResult> Errors(Guid id, CancellationToken cancellationToken)
        => FileOrError(await _service.GetErrorFileAsync(id, cancellationToken));

    private IActionResult FileOrError(Result<Core.Features.Imports.Dto.ImportFile> result)
        => result.IsSuccess
            ? File(result.Data!.Content, XlsxType, result.Data.FileName)
            : Result<object>.Failure(result.Message, result.ErrorStatus).ToActionResult();
}
