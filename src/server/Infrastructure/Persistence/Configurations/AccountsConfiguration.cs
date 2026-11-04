using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class AccountsConfiguration : BaseConfiguration<Accounts>
{
    public override void Configure(EntityTypeBuilder<Accounts> builder)
    {
        base.Configure(builder);
        builder.ToTable("accounts");
        builder.Property(e => e.Name).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Institution).HasMaxLength(100);
        builder.HasIndex(e => new { e.UserId, e.Name }).IsUnique();
        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
    }
}
