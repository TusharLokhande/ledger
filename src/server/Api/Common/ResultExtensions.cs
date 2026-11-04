using Microsoft.AspNetCore.Mvc;
using Core.Common;

namespace Api.Common;

public static class ResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(ApiResponse<T>.FromResult(result));

        return result.ErrorStatus switch
        {
            ErrorStatus.ValidationError => new BadRequestObjectResult(ApiResponse<T>.FromResult(result)),
            ErrorStatus.Duplicate => new ConflictObjectResult(ApiResponse<T>.FromResult(result)),
            ErrorStatus.NotFound => new NotFoundObjectResult(ApiResponse<T>.FromResult(result)),

            ErrorStatus.UnAuthorized => new UnauthorizedObjectResult(ApiResponse<T>.FromResult(result)),
            ErrorStatus.InvalidCred => new UnauthorizedObjectResult(ApiResponse<T>.FromResult(result)),
            ErrorStatus.TokenExpired => new UnauthorizedObjectResult(ApiResponse<T>.FromResult(result)),
            ErrorStatus.Forbidden => new ObjectResult(ApiResponse<T>.FromResult(result)) { StatusCode = 403 },

            ErrorStatus.InternalServerError => new ObjectResult(ApiResponse<T>.FromResult(result)) { StatusCode = 500 },
            _ => new ObjectResult(ApiResponse<T>.FromResult(result)) { StatusCode = 500 }
        };
    }
}
