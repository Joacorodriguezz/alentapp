import { Box, Input, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import type { MemberDTO } from "@alentapp/shared";

export function getMemberDisplayName(memberId: string, members: MemberDTO[]): string {
  const member = members.find((m) => m.id === memberId);
  return member ? member.name : memberId;
}

function getMemberLabel(member: MemberDTO): string {
  return `${member.name} — DNI ${member.dni}`;
}

interface MemberSelectProps {
  members: MemberDTO[];
  value: string;
  onChange: (memberId: string) => void;
  allowEmpty?: boolean;
  placeholder?: string;
}

export function MemberSelect({
  members,
  value,
  onChange,
  allowEmpty = false,
  placeholder = "Seleccionar socio",
}: MemberSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLabel = useMemo(() => {
    if (!value) {
      return allowEmpty ? "Todos los socios" : "";
    }
    const member = members.find((m) => m.id === value);
    return member ? getMemberLabel(member) : value;
  }, [value, members, allowEmpty]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.dni.includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const options = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (allowEmpty && (!searchQuery.trim() || "todos los socios".includes(searchQuery.trim().toLowerCase()))) {
      items.push({ label: "Todos los socios", value: "" });
    }
    for (const member of filteredMembers) {
      items.push({ label: getMemberLabel(member), value: member.id });
    }
    return items;
  }, [filteredMembers, allowEmpty, searchQuery]);

  const openDropdown = () => {
    setIsOpen(true);
    setSearchQuery("");
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelect = (memberId: string) => {
    onChange(memberId);
    closeDropdown();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Box ref={containerRef} position="relative">
      <Box position="relative">
        <Input
          placeholder={isOpen ? "Buscar por DNI o nombre" : placeholder}
          value={isOpen ? searchQuery : selectedLabel}
          onChange={(e) => {
            if (!isOpen) openDropdown();
            setSearchQuery(e.target.value);
          }}
          onFocus={openDropdown}
          onClick={openDropdown}
          pr="10"
          cursor="text"
        />
        <Box
          position="absolute"
          right="3"
          top="50%"
          transform="translateY(-50%)"
          color="fg.muted"
          pointerEvents="none"
        >
          <LuChevronDown />
        </Box>
      </Box>

      {isOpen && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left={0}
          right={0}
          zIndex={20}
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border.muted"
          borderRadius="md"
          boxShadow="md"
          maxH="220px"
          overflowY="auto"
        >
          {options.length === 0 ? (
            <Box px="3" py="2">
              <Text fontSize="sm" color="fg.muted">
                No se encontraron socios
              </Text>
            </Box>
          ) : (
            options.map((option) => (
              <Box
                key={option.value || "__empty__"}
                px="3"
                py="2"
                cursor="pointer"
                bg={option.value === value ? "bg.muted" : undefined}
                _hover={{ bg: "bg.muted/60" }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(option.value)}
              >
                <Text fontSize="sm">{option.label}</Text>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
