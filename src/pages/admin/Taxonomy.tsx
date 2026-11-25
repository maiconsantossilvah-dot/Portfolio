import { useState } from "react";
import Collections from "./Collections";
export default function Taxonomy() {
  const [kind, setKind] = useState<"categories" | "technologies">("categories");
  return (
    <>
      <div className="segmented taxonomy-tabs">
        <button
          aria-pressed={kind === "categories"}
          onClick={() => setKind("categories")}
        >
          Categorias
        </button>
        <button
          aria-pressed={kind === "technologies"}
          onClick={() => setKind("technologies")}
        >
          Tecnologias
        </button>
      </div>
      <Collections key={kind} kind={kind} />
    </>
  );
}
