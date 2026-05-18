import {
  Button,
  Heading,
  Stack,
  Text,
  Box,
  Flex,
  Input,
} from "@chakra-ui/react";
import { LuPlus } from "react-icons/lu";
import { useState } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { Field } from "../components/ui/field";

export function MedicalCertificatesView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    issueDate: "",
    expiryDate: "",
    doctorLicence: "",
    institution: "",
    memberId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await medicalCertificatesService.create(formData);
      setSuccessMessage("¡Certificado médico registrado con éxito! El estado del certificado es Validado por defecto y se han invalidado los registros anteriores de este socio.");
      setFormData({
        issueDate: "",
        expiryDate: "",
        doctorLicence: "",
        institution: "",
        memberId: "",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar el certificado médico");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="8" maxW="2xl" mx="auto">
      <Stack gap="1">
        <Heading size="2xl" fontWeight="bold">Registrar Certificado Médico</Heading>
        <Text color="fg.muted" fontSize="md">
          Digitaliza la gestión de aptos físicos de los socios para garantizar el cumplimiento de normativas de salud.
        </Text>
      </Stack>

      <Box
        bg="bg.panel"
        p="6"
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="4">
            <Field label="ID del Socio (UUID)" required>
              <Input
                placeholder="Ej. 123e4567-e89b-12d3-a456-426614174000"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                required
              />
            </Field>

            <Field label="Fecha de Emisión" required>
              <Input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Fecha de Vencimiento" required>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Matrícula del Profesional" required>
              <Input
                placeholder="Ej. MP 12345"
                value={formData.doctorLicence}
                onChange={(e) => setFormData({ ...formData, doctorLicence: e.target.value })}
                required
              />
            </Field>

            <Field label="Entidad Emisora / Institución" required>
              <Input
                placeholder="Ej. Hospital San Martín"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                required
              />
            </Field>

            {successMessage && (
              <Box p="4" bg="green.50" color="green.700" borderRadius="md" border="1px solid" borderColor="green.200">
                <Text fontWeight="bold">Éxito:</Text>
                <Text>{successMessage}</Text>
              </Box>
            )}

            {errorMessage && (
              <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                <Text fontWeight="bold">Error:</Text>
                <Text>{errorMessage}</Text>
              </Box>
            )}

            <Flex justify="flex-end" mt="4">
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                <LuPlus /> Registrar Certificado
              </Button>
            </Flex>
          </Stack>
        </form>
      </Box>
    </Stack>
  );
}
