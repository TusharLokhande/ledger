using Core.Common;

namespace Core.Features.Accounts.Requests;

public class AccountFilterRequest
{
    public RecordStatus Status { get; set; } = RecordStatus.Active;
}
