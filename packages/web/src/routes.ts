import { createBrowserRouter } from "react-router";

import Layout from "./Layout";
import { DisciplinesView } from "./views/Disciplines";
import { EquipmentLoansView } from "./views/EquipmentLoans";
import { HomeView } from "./views/Home";
import { LockersView } from "./views/Lockers";
import { MembersView } from "./views/Members";
import { PaymentsView } from "./views/Payments";
import { SportsView } from "./views/Sport";

export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: HomeView },
      { path: "/members", Component: MembersView },
      { path: "/payments", Component: PaymentsView },
      { path: "/sports", Component: SportsView },
      { path: "/equipment-loans", Component: EquipmentLoansView },
      { path: "/lockers", Component: LockersView },
      { path: "/disciplines", Component: DisciplinesView },
    ],
  },
]);
