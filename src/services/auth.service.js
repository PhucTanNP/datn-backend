const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');

class AuthService {
  async register({ email, password, fullName, phone, address }) {
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') throw findError;
    if (existingUser) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        address
      })
      .select('id, email, full_name, phone, role, created_at')
      .single();

    if (error) throw error;

    const tokens = await this.generateTokens(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at
      },
      ...tokens
    };
  }

  async login({ email, password }) {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw error;

    const user = users?.[0];
    if (!user || !user.is_active) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const tokens = await this.generateTokens(user.id);
    const { password_hash, ...userData } = user;
    return {
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        phone: userData.phone,
        role: userData.role,
        createdAt: userData.created_at
      },
      ...tokens
    };
  }

  async refreshToken(refreshTokenStr) {
    const { data: tokenRecord, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', refreshTokenStr)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!tokenRecord || tokenRecord.revoked || new Date(tokenRecord.expires_at) < new Date()) {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
    }

    // Revoke old token
    const { error: updateError } = await supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('id', tokenRecord.id);

    if (updateError) throw updateError;

    const tokens = await this.generateTokens(tokenRecord.user_id);
    return tokens;
  }

  async logout(refreshTokenStr) {
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('token', refreshTokenStr);

    if (error) throw error;
  }

  async generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token: refreshToken,
        expires_at: expiresAt
      });

    if (error) throw error;

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
