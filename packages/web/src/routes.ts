import { createBrowserRouter } from "react-router";

import Layout from "./Layout";
import { DisciplinesView } from "./views/Disciplines";
import { HomeView } from "./views/Home";
import { LockersView } from "./views/Lockers";
import { MembersView } from "./views/Members";
import { PaymentsView } from "./views/Payments";
import { MembersView } from "./views/Members";
import { PaymentsView } from "./views/Payments";
import { EquipmentLoansView } from "./views/EquipmentLoans";
import { SportsView } from "./views/Sport";

export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: "/", Component: HomeView },
      { path: "/members", Component: MembersView },
      { path: "/lockers", Component: LockersView },
      { path: "/disciplines", Component: DisciplinesView },
      { path: "/payments", Component: PaymentsView },
      {
        path: "/",
        Component: HomeView,
      },
      {
        path: "/members",
        Component: MembersView,
      },
      {
        path: "/payments",
        Component: PaymentsView,
      },
      {
        path: "/equipment-loans",
        Component: EquipmentLoansView,
      },
    ],
  },
]);

        path: "/sports",
        Component: SportsView,
      },
       {
        path: "/lockers",
        Component: LockersView,
      },
       {
        path: "/disciplines",
        Component: DisciplinesView,
      }
      { path: "/sports", Component: SportsView },
    ],
  },
]);
