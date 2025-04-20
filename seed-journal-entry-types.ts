// Script to seed journal entry types for the accounting system
import { storage } from "./server/storage";
import { insertJournalEntryTypeSchema } from "./shared/schema";

async function seedJournalEntryTypes() {
  console.log("Starting to seed journal entry types...");
  
  // Get tenant IDs
  try {
    // Standard journal entry types used in accounting
    const journalEntryTypes = [
      {
        name: "Journal Entry",
        code: "JE",
        description: "Standard journal entry for manual transactions",
        isActive: true
      },
      {
        name: "Invoice",
        code: "INV",
        description: "Journal entry created from invoice operations",
        isActive: true
      },
      {
        name: "Payment",
        code: "PMT",
        description: "Journal entry created from payment operations",
        isActive: true
      },
      {
        name: "Adjustment",
        code: "ADJ",
        description: "Adjustment entries for correcting balances",
        isActive: true
      },
      {
        name: "Opening Balance",
        code: "OB",
        description: "Opening balance entries for new accounts",
        isActive: true
      },
      {
        name: "Closing Entry",
        code: "CE",
        description: "End of period closing entries",
        isActive: true
      }
    ];
    
    // Get all tenants
    const tenants = await storage.getTenants();
    
    for (const tenant of tenants) {
      console.log(`Seeding journal entry types for tenant ${tenant.id} (${tenant.name})...`);
      
      // Check existing types for this tenant
      const existingTypes = await storage.getJournalEntryTypes(tenant.id);
      const existingCodes = existingTypes.map(type => type.code);
      
      // Create each journal entry type if it doesn't exist
      for (const typeData of journalEntryTypes) {
        if (!existingCodes.includes(typeData.code)) {
          const journalEntryTypeData = {
            ...typeData,
            tenantId: tenant.id
          };
          
          try {
            const validatedData = insertJournalEntryTypeSchema.parse(journalEntryTypeData);
            await storage.createJournalEntryType(validatedData);
            console.log(`Created journal entry type ${typeData.name} (${typeData.code}) for tenant ${tenant.id}`);
          } catch (error) {
            console.error(`Error creating journal entry type ${typeData.code} for tenant ${tenant.id}:`, error);
          }
        } else {
          console.log(`Journal entry type ${typeData.code} already exists for tenant ${tenant.id}`);
        }
      }
    }
    
    console.log("Journal entry types seeding completed.");
  } catch (error) {
    console.error("Error seeding journal entry types:", error);
  }
}

seedJournalEntryTypes()
  .then(() => {
    console.log("Journal entry types seeding script completed.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Journal entry types seeding script failed:", error);
    process.exit(1);
  });