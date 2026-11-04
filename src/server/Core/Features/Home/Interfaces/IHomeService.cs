using Core.Common;
using Core.Features.Home.Dto;
using Core.Features.Home.Requests;

namespace Core.Features.Home.Interfaces;

public interface IHomeService
{
    Task<Result<HomeDto>> GetAsync(HomeRequest request, CancellationToken cancellationToken = default);
}
