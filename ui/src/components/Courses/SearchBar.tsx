import React, { createRef } from "react";
import { Button } from "@/common/Button";
import { Input } from "@/common/Input";
import { Search } from "lucide-react";

interface Props {
  handleSearch: (keyword: string) => void;
}

const SearchBar: React.FC<Props> = ({ handleSearch }) => {
  const inputRef = createRef<HTMLInputElement>();
  const search = () => {
    handleSearch(inputRef.current?.value ?? "");
  };
  return (
    <div className="flex gap-2 flex-1 max-w-md">
      <Input
        ref={inputRef}
        placeholder="Search courses..."
        className="flex-1"
        onKeyDown={(e) => e.key === "Enter" && search()}
      />
      <Button onClick={search} size="default">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </div>
  );
};

export default SearchBar;
