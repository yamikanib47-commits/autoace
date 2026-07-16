/**
 * WhatsApp deep-link helpers, extracted from the admin dashboard so the
 * message-composition logic is reusable/testable independent of the React
 * component tree.
 */
import type { BuyerRequest, VehicleListing } from "@/domain/types";

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildBuyerFollowUpMessage(buyer: BuyerRequest): string {
  const parts = [
    buyer.preferredMake && `preferred make ${buyer.preferredMake}`,
    buyer.preferredModel && `model ${buyer.preferredModel}`,
    buyer.transmission && `${buyer.transmission} transmission`,
    buyer.fuelType && buyer.fuelType,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    `Hi ${buyer.name}, this is AutoAce following up on your car search request` +
    (buyer.budget ? ` (budget ${buyer.budget})` : "") +
    (parts ? ` — ${parts}` : "") +
    `. We have some options that may fit. When would be a good time to chat?`
  );
}

export function buildSellerFollowUpMessage(seller: VehicleListing): string {
  return (
    `Hi ${seller.name}, this is AutoAce about your ${seller.year} ${seller.make} ${seller.model} listing` +
    (seller.price ? ` (asking ${seller.price})` : "") +
    `. We'd like to help you find a buyer — when can we talk?`
  );
}

export function buildInterestFollowUpMessage(interestName: string, seller: VehicleListing): string {
  return `Hi ${interestName}, this is AutoAce about the ${seller.year} ${seller.make} ${seller.model} you were interested in. Are you still keen?`;
}

/** Builds the anonymized, shareable WhatsApp post an admin pastes into seller groups. */
export function buildShareableBuyerPost(buyer: BuyerRequest, sellerFormUrl: string): string {
  const vehicle =
    [buyer.preferredMake, buyer.preferredModel].filter(Boolean).join(" ").trim() ||
    "Any make/model";
  const reqs =
    [
      buyer.preferredYear && `Year ${buyer.preferredYear}`,
      buyer.transmission &&
        `${buyer.transmission.charAt(0).toUpperCase()}${buyer.transmission.slice(1)} transmission`,
      buyer.fuelType && `${buyer.fuelType.charAt(0).toUpperCase()}${buyer.fuelType.slice(1)}`,
      buyer.notes,
    ]
      .filter(Boolean)
      .join(", ") || "Clean condition";
  const posted = new Date(buyer.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    `🚨 AUTOACE WANTED REQUEST 🚨\n\n` +
    `🚗 Looking for:\n${vehicle}\n\n` +
    `💰 Budget:\n${buyer.budget}\n\n` +
    (buyer.preferredYear ? `📅 Preferred Year:\n${buyer.preferredYear}\n\n` : "") +
    `📍 Location:\n${buyer.city || "Zambia"}\n\n` +
    `✅ Requirements:\n${reqs}\n\n` +
    `🗓️ Date posted: ${posted}\n\n` +
    `Have a matching vehicle?\n` +
    `Submit your vehicle here 👉 ${sellerFormUrl}`
  );
}
