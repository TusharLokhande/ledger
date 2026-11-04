using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class UsersConfiguration : BaseConfiguration<Users>
{
    public override void Configure(EntityTypeBuilder<Users> builder)
    {
        base.Configure(builder);
        builder.ToTable("users");
        builder.Property(e => e.Email).HasMaxLength(256).IsRequired();
        builder.Property(e => e.ExternalUid).HasMaxLength(255).IsRequired();
        builder.HasIndex(e => e.ExternalUid).IsUnique();
        builder.Property(e => e.AvatarPath).HasMaxLength(255);
        builder.Property(e => e.Name).HasMaxLength(100);
        builder.Property(e => e.CurrencyCode).HasMaxLength(3).IsRequired().HasDefaultValue("INR");
    }
}
