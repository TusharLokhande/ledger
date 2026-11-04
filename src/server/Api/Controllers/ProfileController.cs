using Api.Common;
using Core.Features.Profile.Interfaces;
using Core.Features.Profile.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet("avatar")]
    public async Task<IActionResult> GetAvatar(CancellationToken cancellationToken)
    {
        var result = await _profileService.GetAvatarAsync(cancellationToken);
        if (!result.IsSuccess)
            return result.ToActionResult();

        Response.Headers.CacheControl = "private, max-age=86400";
        return File(result.Data!.Content, result.Data.ContentType);
    }

    [HttpPut("currency")]
    public async Task<IActionResult> UpdateCurrency(UpdateCurrencyRequest request, CancellationToken cancellationToken)
        => (await _profileService.UpdateCurrencyAsync(request, cancellationToken)).ToActionResult();
}
