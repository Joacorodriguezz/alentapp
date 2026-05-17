import {
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  Flex,
  Input,
  Box,
  Center,
  Spinner,
  Table,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useState, useEffect } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import type { CreateMedicalCertificateRequest, MedicalCertificateDTO } from "@alentapp/shared";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

export function MedicalCertificatesView() {
  const [certificates, setCertificates] = useState<MedicalCertificateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateMedicalCertificateRequest>({
    issueDate: "",
    expiryDate: "",
    doctorLicence: "",
    institution: "",
    memberId: "",
  });

  const fetchCertificates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await medicalCertificatesService.getAll();
      setCertificates(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los certificados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const openCreateModal = () => {
    setFormData({ issueDate: "", expiryDate: "", doctorLicence: "", institution: "", memberId: "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await medicalCertificatesService.create(formData);
      setIsDialogOpen(false);
      alert("Certificado médico registrado correctamente.");
      fetchCertificates();
    } catch (err: any) {
      alert(err.message || "Error al registrar el certificado médico");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Certificados Médicos</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra los aptos físicos de los socios del club.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchCertificates} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Certificado
            </Button>
          </HStack>
        </Flex>

        {/* Modal para registrar certificado */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Registrar Certificado Médico</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
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
                <Field label="Matrícula del Médico" required>
                  <Input
                    placeholder="Ej. 12345"
                    value={formData.doctorLicence}
                    onChange={(e) => setFormData({ ...formData, doctorLicence: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Institución" required>
                  <Input
                    placeholder="Ej. Hospital Municipal"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    required
                  />
                </Field>
                <Field label="ID del Socio" required>
                  <Input
                    placeholder="UUID del socio"
                    value={formData.memberId}
                    onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                    required
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Registrar Certificado
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

        <Box 
          bg="bg.panel" 
          borderRadius="xl" 
          boxShadow="sm" 
          borderWidth="1px" 
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando certificados...</Text>
              </Stack>
            </Center>
          ) : certificates.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron certificados médicos.</Text>
                <Button variant="ghost" onClick={fetchCertificates}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">ID</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Emisión</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Matrícula</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Institución</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio (ID)</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {certificates.map((cert) => (
                  <Table.Row key={cert.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell color="fg.muted" fontSize="xs" fontFamily="mono">
                      {cert.id.substring(0, 8)}...
                    </Table.Cell>
                    <Table.Cell>{new Date(cert.issueDate).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>{new Date(cert.expiryDate).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>{cert.doctorLicence}</Table.Cell>
                    <Table.Cell>{cert.institution}</Table.Cell>
                    <Table.Cell color="fg.muted" fontSize="xs" fontFamily="mono">
                      {cert.memberId.substring(0, 8)}...
                    </Table.Cell>
                    <Table.Cell>
                      <Box 
                        display="inline-block" 
                        px="2" 
                        py="0.5" 
                        borderRadius="md" 
                        bg={cert.isValidated ? 'green.50' : 'red.50'} 
                        color={cert.isValidated ? 'green.700' : 'red.700'} 
                        fontSize="xs" 
                        fontWeight="bold"
                      >
                        {cert.isValidated ? 'Válido' : 'Inválido'}
                      </Box>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
