using Domain.Entity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

public class TransactionsConfiguration : BaseConfiguration<Transactions>
{
    public override void Configure(EntityTypeBuilder<Transactions> builder)
    {
        base.Configure(builder);
        builder.ToTable("transactions");
        builder.Property(e => e.Amount).HasPrecision(18, 4);
        builder.Property(e => e.Note).HasMaxLength(500);

        builder.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
        builder.HasOne(e => e.Account).WithMany().HasForeignKey(e => e.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.DestinationAccount).WithMany().HasForeignKey(e => e.DestinationAccountId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.ImportBatch).WithMany().HasForeignKey(e => e.ImportBatchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(e => new { e.UserId, e.TransactionDate });
    }
}
