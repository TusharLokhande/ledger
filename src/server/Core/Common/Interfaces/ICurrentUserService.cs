namespace Core.Common.Interfaces;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    IReadOnlyList<string> Roles { get; }
}
