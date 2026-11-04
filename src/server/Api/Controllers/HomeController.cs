using Api.Common;
using Core.Features.Home.Interfaces;
using Core.Features.Home.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/home")]
[Authorize]
public class HomeController : ControllerBase
{
    private readonly IHomeService _service;

    public HomeController(IHomeService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Get(HomeRequest request, CancellationToken cancellationToken)
        => (await _service.GetAsync(request, cancellationToken)).ToActionResult();
}
