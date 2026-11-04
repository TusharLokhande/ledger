using Api.Common;
using Core.Common.Dashboard;
using Core.Features.Categories.Interfaces;
using Core.Features.Categories.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _service;

    public CategoriesController(ICategoryService service)
    {
        _service = service;
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search(PageRequest<CategoryFilterRequest> request, CancellationToken cancellationToken)
        => (await _service.SearchAsync(request, cancellationToken)).ToActionResult();

    [HttpGet("options")]
    public async Task<IActionResult> Options(CancellationToken cancellationToken)
        => (await _service.GetOptionsAsync(cancellationToken)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        => (await _service.GetByIdAsync(id, cancellationToken)).ToActionResult();

    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryRequest request, CancellationToken cancellationToken)
        => (await _service.CreateAsync(request, cancellationToken)).ToActionResult();

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
        => (await _service.UpdateAsync(id, request, cancellationToken)).ToActionResult();

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
        => (await _service.SetActiveAsync(id, false, cancellationToken)).ToActionResult();

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id, CancellationToken cancellationToken)
        => (await _service.SetActiveAsync(id, true, cancellationToken)).ToActionResult();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        => (await _service.DeleteAsync(id, cancellationToken)).ToActionResult();
}
