using Core.Common;
using Core.Common.Interfaces;
using Core.Features.Auth.Dto;
using Core.Features.Profile.Dto;
using Core.Features.Profile.Interfaces;
using Core.Features.Profile.Requests;
using Core.Interfaces.Repository;
using Core.Interfaces.UnitOfWork;
using Domain.Entity;

namespace Core.Features.Profile.Services;

public class ProfileService : IProfileService
{
    private readonly IRepository<Users> _users;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly TimeProvider _timeProvider;
    private readonly IAvatarStore _avatars;

    public ProfileService(IRepository<Users> users, IUnitOfWork unitOfWork, ICurrentUserService currentUser, TimeProvider timeProvider, IAvatarStore avatars)
    {
        _avatars = avatars;
        _users = users;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _timeProvider = timeProvider;
    }

    public async Task<Result<AvatarFile>> GetAvatarAsync(CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(_currentUser.UserId!.Value, cancellationToken);
        var avatar = user?.AvatarPath is null ? null : await _avatars.ReadAsync(user.AvatarPath, cancellationToken);
        return avatar is { } a
            ? Result<AvatarFile>.Success(new AvatarFile(a.Content, a.ContentType))
            : Result<AvatarFile>.Failure("No avatar.", ErrorStatus.NotFound);
    }

    public async Task<Result<AuthUserDto>> UpdateCurrencyAsync(UpdateCurrencyRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId!.Value;
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<AuthUserDto>.Failure("User not found.", ErrorStatus.NotFound);

        user.CurrencyCode = request.CurrencyCode;
        user.UpdatedBy = userId;
        user.UpdatedAtUtc = _timeProvider.GetUtcNow().UtcDateTime;
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<AuthUserDto>.Success(AuthUserDto.From(user));
    }
}
