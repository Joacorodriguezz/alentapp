import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { LuUsers, LuCreditCard, LuPackage } from "react-icons/lu";
import { SectionCard } from "../components/SectionCard";

export function HomeView() {
  return (
    <Box>
      <VStack gap="6" align="flex-start" mb="12">
        <Heading 
          size="4xl" 
          fontWeight="extrabold" 
          letterSpacing="tight"
          bgGradient="to-r"
          gradientFrom="blue.600"
          gradientTo="cyan.400"
          bgClip="text"
        >
          Bienvenido a Alentapp
        </Heading>
        <Text fontSize="xl" color="fg.muted" maxW="2xl">
          El panel de administración central para gestionar todos los aspectos de tu club. 
          Selecciona una sección a continuación para comenzar.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8">
        <SectionCard 
          title="Miembros"
          description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
          to="/members"
          icon={LuUsers}
        />
        <SectionCard 
          title="Pagos"
          description="Registra y consulta los pagos de cuotas y servicios de los socios."
          to="/payments"
          icon={LuCreditCard}
        />
        <SectionCard
          title="Préstamos"
          description="Registra y gestiona los préstamos de equipamiento a los socios del club."
          to="/equipment-loans"
          icon={LuPackage}
        />
      </SimpleGrid>
    </Box>
  );
}
