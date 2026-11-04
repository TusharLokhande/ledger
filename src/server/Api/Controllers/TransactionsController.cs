using Api.Common;
using Core.Common.Dashboard;
using Core.Features.Transactions.Interfaces;
using Core.Features.Transactions.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/transactions")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _service;

    public TransactionsController(ITransactionService service)
    {
        _service = service;
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search(PageRequest<TransactionFilterRequest> request, CancellationToken cancellationToken)
        => (await _service.SearchAsync(request, cancellationToken)).ToActionResult();

    [HttpPost("summary")]
    public async Task<IActionResult> Summary(TransactionSummaryRequest request, CancellationToken cancellationToken)
        => (await _service.SummaryAsync(request, cancellationToken)).ToActionResult();

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        => (await _service.GetByIdAsync(id, cancellationToken)).ToActionResult();

    [HttpPost]
    public async Task<IActionResult> Create(SaveTransactionRequest request, CancellationToken cancellationToken)
        => (await _service.CreateAsync(request, cancellationToken)).ToActionResult();

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, SaveTransactionRequest request, CancellationToken cancellationToken)
        => (await _service.UpdateAsync(id, request, cancellationToken)).ToActionResult();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        => (await _service.DeleteAsync(id, cancellationToken)).ToActionResult();
}
