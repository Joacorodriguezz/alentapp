import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeView } from './Home';
import { MemoryRouter } from 'react-router';
import { Provider } from '../components/ui/provider';

describe('HomeView', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <MemoryRouter>
                <Provider>
                    {ui}
                </Provider>
            </MemoryRouter>
        );
    };

    it('debe renderizar el titulo de bienvenida', () => {
        renderWithProviders(<HomeView />);
        expect(screen.getByText('Bienvenido a Alentapp')).toBeInTheDocument();
    });

    it('debe contener la tarjeta de la seccion "Miembros"', () => {
        renderWithProviders(<HomeView />);

        expect(screen.getByText('Miembros')).toBeInTheDocument();
        expect(screen.getByText(/Administra el padron de socios/i)).toBeInTheDocument();
    });

    it('debe contener la tarjeta de la seccion "Lockers"', () => {
        renderWithProviders(<HomeView />);

        expect(screen.getByText('Lockers')).toBeInTheDocument();
        expect(screen.getByText(/Registra nuevos lockers del club/i)).toBeInTheDocument();
    });
});
