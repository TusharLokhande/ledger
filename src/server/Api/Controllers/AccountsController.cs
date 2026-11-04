using Api.Common;
using Core.Common.Dashboard;
using Core.Features.Accounts.Interfaces;
using Core.Features.Accounts.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _service;

    public AccountsController(IAccountService service)
    {
        _service = service;
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search(PageRequest<AccountFilterRequest> request, CancellationToken cancellationToken)
        => (await _service.SearchAsync(request, cancellationToken)).ToActionResult();

    [HttpGet("options")]
    public async Task<IActionResult> Options(CancellationToken cancellationToken)
        => (await _service.GetOptionsAsync(cancellationToken)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        => (await _service.GetByIdAsync(id, cancellationToken)).ToActionResult();

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest request, CancellationToken cancellationToken)
        => (await _service.CreateAsync(request, cancellationToken)).ToActionResult();

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAccountRequest request, CancellationToken cancellationToken)
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
