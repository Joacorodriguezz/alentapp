import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { LuPlus } from "react-icons/lu";
import { useState } from "react";
import type { CreateSportRequest, SportResponse } from "@alentapp/shared";
import { sportsService } from "../services/sport";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  createListCollection,
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../components/ui/select";

const medicalCertificateOptions = createListCollection({
  items: [
    { label: "No", value: "false" },
    { label: "Sí", value: "true" },
  ],
});

type SportFormData = {
  name: string;
  description: string;
  maxCapacity: string;
  additionalPrice: string;
  requiresMedicalCertificate: boolean;
};

const initialFormData: SportFormData = {
  name: "",
  description: "",
  maxCapacity: "",
  additionalPrice: "",
  requiresMedicalCertificate: false,
};

export function SportsView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSport, setCreatedSport] = useState<SportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SportFormData>(initialFormData);

  const openCreateModal = () => {
    setFormData(initialFormData);
    setError(null);
    setCreatedSport(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload: CreateSportRequest = {
      name: formData.name,
      description: formData.description || undefined,
      maxCapacity: Number(formData.maxCapacity),
      additionalPrice: formData.additionalPrice
        ? Number(formData.additionalPrice)
        : undefined,
      requiresMedicalCertificate: formData.requiresMedicalCertificate,
    };

    try {
      const sport = await sportsService.create(payload);
      setCreatedSport(sport);
      setIsDialogOpen(false);
      setFormData(initialFormData);
    } catch (err: any) {
      setError(err.message || "Error al crear el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona las actividades deportivas disponibles en Alentapp.
            </Text>
          </Stack>
          <Button colorPalette="blue" size="md" onClick={openCreateModal}>
            <LuPlus /> Agregar Deporte
          </Button>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Deporte</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre" required>
                  <Input
                    placeholder="Ej. Natación"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Descripción">
                  <Input
                    placeholder="Ej. Clases para todos los niveles"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Field>
                <Field label="Capacidad Máxima" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ej. 30"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Precio Adicional">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej. 1500"
                    value={formData.additionalPrice}
                    onChange={(e) => setFormData({ ...formData, additionalPrice: e.target.value })}
                  />
                </Field>
                <Field label="Requiere Certificado Médico" required>
                  <SelectRoot
                    collection={medicalCertificateOptions}
                    value={[String(formData.requiresMedicalCertificate)]}
                    onValueChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresMedicalCertificate: e.value[0] === "true",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicalCertificateOptions.items.map((option) => (
                        <SelectItem item={option} key={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Deporte
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        {createdSport && (
          <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
            <Text fontWeight="bold">Deporte creado correctamente:</Text>
            <Text>{createdSport.name}</Text>
          </Box>
        )}
      </Stack>
    </DialogRoot>
  );
}
