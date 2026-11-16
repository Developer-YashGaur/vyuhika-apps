import type { JsonLd as JsonLdData } from "@/lib/structured-data";

// Puts structured data in the page as <script type="application/ld+json">, one script per item.
// "<" is escaped so text inside the data can never close the script tag early.
export default function JsonLd({ data }: { data: JsonLdData[] }) {
  return (
    <>
      {data.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
