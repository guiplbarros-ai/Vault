"use client";

/**
 * Profile Settings Section
 * Agent CORE: Owner
 *
 * Configurações de perfil do usuário (foto, informações pessoais, etc)
 */

import { useState, useEffect, useRef } from 'react';
import { SettingsCard } from '@/components/settings';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Camera, Save, Loader2, User } from 'lucide-react';
import { usuarioService, type UpdatePerfilDTO } from '@/lib/services/usuario.service';
import { useToast } from '@/hooks/use-toast';
import type { Usuario } from '@/lib/types';

export function ProfileSection() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    biografia: '',
    data_nascimento: '',
  });

  // Carrega dados do usuário atual
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      // Busca usuário ativo do localStorage
      const currentUserId = localStorage.getItem('cortex-cash-current-user-id');
      if (!currentUserId) {
        console.warn('Nenhum usuário ativo encontrado');
        return;
      }

      const user = await usuarioService.getUsuarioById(currentUserId);
      if (user) {
        setUsuario(user);
        setFormData({
          nome: user.nome || '',
          email: user.email || '',
          telefone: user.telefone || '',
          cpf: user.cpf || '',
          biografia: user.biografia || '',
          data_nascimento: user.data_nascimento
            ? new Date(user.data_nascimento).toISOString().split('T')[0]
            : '',
        });
        setPreviewUrl(user.avatar_url);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    // Converte para base64 e salva
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!usuario) return;

    try {
      setIsSaving(true);

      const updateData: UpdatePerfilDTO = {
        nome: formData.nome,
        telefone: formData.telefone || undefined,
        cpf: formData.cpf || undefined,
        biografia: formData.biografia || undefined,
        data_nascimento: formData.data_nascimento
          ? new Date(formData.data_nascimento)
          : undefined,
        avatar_url: previewUrl,
      };

      const updatedUser = await usuarioService.updatePerfil(usuario.id, updateData);
      setUsuario(updatedUser);

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar suas informações',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Foto de Perfil */}
      <SettingsCard
        title="Foto de Perfil"
        description="Adicione uma foto para personalizar seu perfil"
      >
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={previewUrl} alt={formData.nome} />
            <AvatarFallback className="text-2xl bg-primary text-foreground">
              {formData.nome ? getInitials(formData.nome) : <User className="w-10 h-10" />}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-card border-border text-foreground hover:bg-muted"
            >
              <Camera className="w-4 h-4 mr-2" />
              Alterar foto
            </Button>
            <p className="text-xs mt-2 text-foreground/50">
              JPG, PNG ou GIF. Máximo 5MB.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Informações Pessoais */}
      <SettingsCard
        title="Informações Pessoais"
        description="Gerencie suas informações básicas"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome" className="text-foreground/90">
              Nome completo
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="mt-1 bg-card border-border text-foreground"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground/90">
              Email
              <Badge variant="secondary" className="ml-2 text-xs">
                Não editável
              </Badge>
            </Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="mt-1 cursor-not-allowed bg-card border-border text-foreground opacity-50"
            />
            <p className="text-xs mt-1 text-foreground/50">
              O email não pode ser alterado por questões de segurança
            </p>
          </div>

          <div>
            <Label htmlFor="telefone" className="text-foreground/90">
              Telefone
            </Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="mt-1 bg-card border-border text-foreground"
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          <div>
            <Label htmlFor="data_nascimento" className="text-foreground/90">
              Data de Nascimento
            </Label>
            <Input
              id="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) =>
                setFormData({ ...formData, data_nascimento: e.target.value })
              }
              className="mt-1 bg-card border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="cpf" className="text-foreground/90">
              CPF
            </Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              className="mt-1 bg-card border-border text-foreground"
              placeholder="XXX.XXX.XXX-XX"
            />
          </div>

          <div>
            <Label htmlFor="biografia" className="text-foreground/90">
              Biografia
            </Label>
            <Textarea
              id="biografia"
              value={formData.biografia}
              onChange={(e) => setFormData({ ...formData, biografia: e.target.value })}
              className="mt-1 min-h-[100px] bg-card border-border text-foreground"
              placeholder="Conte um pouco sobre você..."
            />
          </div>
        </div>
      </SettingsCard>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-success text-background hover:bg-success/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
