using System;
using Domain.Common;

namespace Domain.Entity;

public class Users: BaseEntity 
{
    public string Email { get; set; } = string.Empty;
    /// <summary>Display name. Null for accounts created before names were collected.</summary>
    public string? Name { get; set; }
    /// <summary>Google account id (`sub`). Users are matched by this, never by email.</summary>
    public string ExternalUid { get; set; } = string.Empty;
    /// <summary>Blob path in the avatars container; null when the user has no photo.</summary>
    public string? AvatarPath { get; set; }
    public string CurrencyCode { get; set; } = "INR";
}
